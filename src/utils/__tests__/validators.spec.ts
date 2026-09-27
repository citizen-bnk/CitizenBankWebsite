import { describe, it, expect } from "vitest";
import { isNonEmpty, isPhone, isDate, canProceedIdentity, canProceedContact, canProceedKyc } from "utils/validators";

describe("validators", () => {
  it("isNonEmpty", () => {
    expect(isNonEmpty("a")).toBe(true);
    expect(isNonEmpty(" ")).toBe(false);
    expect(isNonEmpty("")).toBe(false);
  });

  it("isPhone", () => {
    expect(isPhone("+266 51234567")).toBe(true);
    expect(isPhone("123")).toBe(false);
  });

  it("isDate", () => {
    expect(isDate("1990-01-01")).toBe(true);
    expect(isDate("not-a-date")).toBe(false);
  });

  it("canProceedIdentity", () => {
    expect(canProceedIdentity({ id_type: "ID", id_number: "123", full_name: "A" })).toBe(true);
    expect(canProceedIdentity({ id_type: "", id_number: "", full_name: "" })).toBe(false);
  });

  it("canProceedContact", () => {
    expect(canProceedContact({ phone: "+266 51234567", street_address: "1 Street", city: "Maseru", country: "Lesotho" })).toBe(true);
    expect(canProceedContact({ phone: "123", street_address: "", city: "", country: "" })).toBe(false);
  });

  it("canProceedKyc", () => {
    expect(canProceedKyc({ date_of_birth: "1990-01-01", nationality: "Lesotho" })).toBe(true);
    expect(canProceedKyc({ date_of_birth: "", nationality: "" })).toBe(false);
  });
});
