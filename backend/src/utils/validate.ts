//small input checker for request bodies
//it collects every problem first, so the app gets all bad fields in one response instead of one at a time

import { AppError } from "./AppError"; //used to throw the validation error

//full iso date and time, for example what new date().toisostring() gives in javascript
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export class Validator {
  private errors: Record<string, string> = {}; //field name -> what is wrong with it

  constructor(private readonly body: Record<string, unknown>) {} //the request body to check

  //checks a text field. optional fields may be missing, required ones must have real text
  string(field: string, opts: { optional?: boolean; maxLength?: number; pattern?: RegExp; hint?: string } = {}): this {
    const v = this.body[field]; //value sent by the app
    if (v === undefined || v === null) {
      if (!opts.optional) this.errors[field] = "required"; //missing but needed
      return this; //nothing more to check
    }
    if (typeof v !== "string") this.errors[field] = "must be a string"; //wrong type
    else if (!opts.optional && v.trim().length === 0) this.errors[field] = "must not be empty"; //only spaces
    else if (opts.maxLength && v.length > opts.maxLength) this.errors[field] = `must be at most ${opts.maxLength} characters`; //too long
    else if (opts.pattern && !opts.pattern.test(v)) this.errors[field] = opts.hint ?? "has the wrong format"; //wrong format
    return this; //lets checks be chained
  }

  //checks that a field is one of a fixed list of values
  oneOf(field: string, allowed: readonly string[], opts: { optional?: boolean } = {}): this {
    const v = this.body[field]; //value sent by the app
    if (v === undefined || v === null) {
      if (!opts.optional) this.errors[field] = "required"; //missing but needed
      return this;
    }
    if (typeof v !== "string" || !allowed.includes(v)) this.errors[field] = `must be one of: ${allowed.join(", ")}`; //not in the list
    return this;
  }

  //checks a field that must be sent but may be null, like a claim id when nothing matched
  nullableString(field: string, opts: { maxLength?: number } = {}): this {
    const v = this.body[field]; //value sent by the app
    if (v === undefined) this.errors[field] = "required (use null if none)"; //must be present
    else if (v !== null && typeof v !== "string") this.errors[field] = "must be a string or null"; //wrong type
    else if (typeof v === "string" && opts.maxLength && v.length > opts.maxLength) this.errors[field] = `must be at most ${opts.maxLength} characters`; //too long
    return this;
  }

  //checks a list of strings, with limits so nobody can send a huge list
  stringArray(field: string, opts: { maxItems?: number; maxLength?: number } = {}): this {
    const v = this.body[field]; //value sent by the app
    const maxItems = opts.maxItems ?? 100; //default limit on list size
    const maxLength = opts.maxLength ?? 2000; //default limit on each item
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) this.errors[field] = "must be an array of strings"; //wrong type
    else if (v.length > maxItems) this.errors[field] = `must have at most ${maxItems} items`; //too many items
    else if (v.some((x) => x.length > maxLength)) this.errors[field] = `items must be at most ${maxLength} characters`; //an item is too long
    return this;
  }

  //checks a full iso date time string
  isoDate(field: string): this {
    const v = this.body[field]; //value sent by the app
    if (typeof v !== "string" || !ISO_DATE_TIME.test(v) || Number.isNaN(Date.parse(v))) {
      this.errors[field] = "must be an iso timestamp like 2026-10-26T10:00:00.000Z"; //not a valid time
    }
    return this;
  }

  //lets a controller add its own rule, for example "end time must be after start time"
  custom(field: string, ok: boolean, message: string): this {
    if (!ok && !this.errors[field]) this.errors[field] = message; //only if the field has no other error yet
    return this;
  }

  //throws one validation error listing every bad field, or does nothing if all is fine
  check(): void {
    if (Object.keys(this.errors).length > 0) {
      throw new AppError("VALIDATION_ERROR", "Request validation failed", { fields: this.errors });
    }
  }
}

//makes sure the body is a plain json object (not missing, not a list, not a number)
export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be a JSON object"); //stop here
  }
  return body as Record<string, unknown>; //safe to read fields now
}
