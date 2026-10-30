// Fact Check fallback: when the curated database has no match, ask Google's
// Fact Check Tools API whether any fact-checker has reviewed the claim.
// Never throws — returns { found: false } on error, timeout, or no result,
// so a Fact Check outage cannot break the /api/verify flow.
//
// IMPORTANT: this API requires an API key, NOT a service account OAuth token.
// Google support confirmed the search RPCs use API keys [citation:4].
// Service account tokens produce "INVALID_ARGUMENT" errors.

import { FactCheckResult } from "../types/shared";

const FACT_CHECK_TIMEOUT_MS = 3000;
const FACT_CHECK_BASE_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search";

interface GoogleFactCheckResponse {
  claims?: Array<{
    claimReview?: Array<{
      textualRating?: string;
      url?: string;
      reviewDate?: string;
      publisher?: {
        name?: string;
        site?: string;
      };
    }>;
  }>;
}

/**
 * Looks up a claim in Google's Fact Check Tools API.
 * Times out after 3s; never throws.
 * Requires FACT_CHECK_API_KEY in .env (API key, not service account key).
 */
export async function factCheck(claimText: string): Promise<FactCheckResult> {
  const trimmed = claimText.trim();

  // Too short to be a meaningful claim — Google's API needs real text.
  if (trimmed.length < 10) {
    return { found: false };
  }

  const apiKey = process.env.FACT_CHECK_API_KEY;
  console.log("[factcheck] API key present:", !!apiKey, "| query:", trimmed.slice(0, 40));
  if (!apiKey) {
    console.warn("[factcheck] FACT_CHECK_API_KEY not set; skipping fact check");
    return { found: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FACT_CHECK_TIMEOUT_MS);

  try {
    const url = new URL(FACT_CHECK_BASE_URL);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("languageCode", "en");
    url.searchParams.set("pageSize", "3");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(
        `[factcheck] HTTP ${response.status} for "${trimmed.slice(0, 50)}...": ${body.slice(0, 200)}`
      );
      return { found: false };
    }

    const data = (await response.json()) as GoogleFactCheckResponse;
    const claims = data.claims ?? [];
    if (claims.length === 0) {
      return { found: false };
    }

    // Take the first claim, then its first review. Google returns most
    // relevant first. A claim may have multiple reviews (Snopes, PolitiFact, etc.).
    const firstClaim = claims[0];
    const review = firstClaim.claimReview?.[0];
    if (!review) {
      return { found: false };
    }

    return {
      found: true,
      rating: review.textualRating,
      publisher: review.publisher?.name ?? review.publisher?.site,
      url: review.url,
      reviewDate: review.reviewDate,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[factcheck] timeout after ${FACT_CHECK_TIMEOUT_MS}ms for "${trimmed.slice(0, 50)}..."`);
    } else {
      console.warn(
        `[factcheck] failed for "${trimmed.slice(0, 50)}...":`,
        err instanceof Error ? err.message : String(err)
      );
    }
    return { found: false };
  }
}