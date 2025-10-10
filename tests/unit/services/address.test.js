import { describe, it, expect } from "vitest";
import { findAddressForBuilding } from "@/services/address.js";

describe("address service", () => {
  describe("findAddressForBuilding", () => {
    it("should construct address with katunimi_suomi and osoitenumero", () => {
      const properties = {
        katunimi_suomi: "Mannerheimintie",
        osoitenumero: "15",
      };

      expect(findAddressForBuilding(properties)).toBe("Mannerheimintie 15");
    });

    it("should construct address with katunimi_suomi only", () => {
      const properties = {
        katunimi_suomi: "Esplanadi",
      };

      expect(findAddressForBuilding(properties)).toBe("Esplanadi");
    });

    it("should construct address with katu and osno1", () => {
      const properties = {
        katu: "Aleksanterinkatu",
        osno1: "10",
      };

      expect(findAddressForBuilding(properties)).toBe("Aleksanterinkatu 10");
    });

    it("should construct address with katu, osno1, and oski1", () => {
      const properties = {
        katu: "Unioninkatu",
        osno1: "20",
        oski1: "A",
      };

      expect(findAddressForBuilding(properties)).toBe("Unioninkatu 20 A");
    });

    it("should construct address with katu, osno1, oski1, and osno2", () => {
      const properties = {
        katu: "Fabianinkatu",
        osno1: "30",
        oski1: "B",
        osno2: "2",
      };

      expect(findAddressForBuilding(properties)).toBe("Fabianinkatu 30 B 2");
    });

    it("should handle prefixed properties with underscore", () => {
      const properties = {
        _katunimi_suomi: "Kaivokatu",
        _osoitenumero: "8",
      };

      expect(findAddressForBuilding(properties)).toBe("Kaivokatu 8");
    });

    it("should prefer non-prefixed over prefixed properties", () => {
      const properties = {
        katunimi_suomi: "Pohjoisesplanadi",
        _katunimi_suomi: "Wrong Street",
        osoitenumero: "5",
        _osoitenumero: "99",
      };

      expect(findAddressForBuilding(properties)).toBe("Pohjoisesplanadi 5");
    });

    it("should fallback to katu properties when katunimi_suomi is not available", () => {
      const properties = {
        katu: "Temppeliaukio",
        osno1: "1",
        katunimi_suomi: null,
      };

      expect(findAddressForBuilding(properties)).toBe("Temppeliaukio 1");
    });

    it("should skip invalid osno1 values (999999999)", () => {
      const properties = {
        katu: "Senaatintori",
        osno1: 999999999,
      };

      expect(findAddressForBuilding(properties)).toBe("Senaatintori");
    });

    it("should skip invalid oski1 values (999999999)", () => {
      const properties = {
        katu: "Helsingin tuomiokirkko",
        osno1: "1",
        oski1: 999999999,
      };

      expect(findAddressForBuilding(properties)).toBe(
        "Helsingin tuomiokirkko 1",
      );
    });

    it("should skip invalid osno2 values (999999999)", () => {
      const properties = {
        katu: "Suurkatu",
        osno1: "10",
        oski1: "C",
        osno2: 999999999,
      };

      expect(findAddressForBuilding(properties)).toBe("Suurkatu 10 C");
    });

    it('should return "n/a" when no valid address components exist', () => {
      const properties = {
        someOtherProperty: "value",
      };

      expect(findAddressForBuilding(properties)).toBe("n/a");
    });

    it('should return "n/a" for empty properties', () => {
      expect(findAddressForBuilding({})).toBe("n/a");
    });

    it("should handle null and undefined properties gracefully", () => {
      const properties = {
        katunimi_suomi: null,
        katu: undefined,
        osoitenumero: null,
      };

      expect(findAddressForBuilding(properties)).toBe("n/a");
    });

    it('should remove "null" strings from the final address', () => {
      const properties = {
        katunimi_suomi: "Katunull",
        osoitenumero: "nullnull5null",
      };

      expect(findAddressForBuilding(properties)).toBe("Katu 5");
    });

    it("should trim whitespace from the final address", () => {
      const properties = {
        katunimi_suomi: "  Katu  ",
        osoitenumero: "  10  ",
      };

      expect(findAddressForBuilding(properties)).toBe("Katu 10");
    });

    it("should handle mixed valid and invalid values", () => {
      const properties = {
        katu: "Mikonkatu",
        osno1: "12",
        oski1: 999999999,
        osno2: "5",
      };

      expect(findAddressForBuilding(properties)).toBe("Mikonkatu 12");
    });

    it("should handle empty strings as invalid", () => {
      const properties = {
        katunimi_suomi: "",
        katu: "Backup Street",
        osno1: "7",
      };

      expect(findAddressForBuilding(properties)).toBe("Backup Street 7");
    });

    it("should handle zero values correctly", () => {
      const properties = {
        katu: "Zerokatu",
        osno1: "0",
      };

      expect(findAddressForBuilding(properties)).toBe("Zerokatu 0");
    });

    it("should handle complex null removal scenarios", () => {
      const properties = {
        katunimi_suomi: "nullStartnullMiddlenullEnd",
        osoitenumero: "nullnullnull",
      };

      expect(findAddressForBuilding(properties)).toBe("StartMiddleEnd");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle properties with only invalid sentinel values", () => {
      const properties = {
        katu: "Street",
        osno1: 999999999,
        oski1: 999999999,
        osno2: 999999999,
      };

      expect(findAddressForBuilding(properties)).toBe("Street");
    });

    it("should handle numeric street names", () => {
      const properties = {
        katunimi_suomi: "1st Avenue",
        osoitenumero: "100",
      };

      expect(findAddressForBuilding(properties)).toBe("1st Avenue 100");
    });

    it("should handle special characters in addresses", () => {
      const properties = {
        katunimi_suomi: "Hämeentie/Tavastvägen",
        osoitenumero: "123-125",
      };

      expect(findAddressForBuilding(properties)).toBe(
        "Hämeentie/Tavastvägen 123-125",
      );
    });

    it("should handle boolean values as properties", () => {
      const properties = {
        katunimi_suomi: true,
        osoitenumero: false,
      };

      expect(findAddressForBuilding(properties)).toBe("true false");
    });

    it("should handle arrays as properties", () => {
      const properties = {
        katunimi_suomi: ["First", "Street"],
        osoitenumero: [1, 2, 3],
      };

      expect(findAddressForBuilding(properties)).toBe("First,Street 1,2,3");
    });

    it("should handle objects as properties", () => {
      const properties = {
        katunimi_suomi: { name: "Street" },
        osoitenumero: { number: 5 },
      };

      expect(findAddressForBuilding(properties)).toBe(
        "[object Object] [object Object]",
      );
    });
  });
});
