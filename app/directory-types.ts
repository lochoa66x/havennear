export type ShelterStatus = "available" | "limited" | "full" | "call";
export type ParticipationState = "directory" | "participating";

export type PublicShelter = {
  id: string;
  name: string;
  shelterType: string;
  address: string;
  city: string;
  provinceCode: string;
  countryCode: "CA";
  latitude?: number;
  longitude?: number;
  phone: string;
  phoneDisplay: string;
  participation: ParticipationState;
  status: ShelterStatus;
  statusLabel: string;
  availabilityUpdatedAt?: string;
  availabilityExpiresAt?: string;
  spacesAvailable?: number;
  hours: string;
  intake: string;
  groups: string[];
  services: string[];
  accessibility: string[];
  languages: string[];
  note: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceCheckedAt: string;
  confidentialAddress: boolean;
};

export type PublicShelterResponse = {
  shelters: PublicShelter[];
  page: number;
  limit: number;
  total: number;
};

export const shelterFilters = [
  "Open 24/7",
  "Women",
  "Men",
  "Youth",
  "Families",
  "Indigenous",
  "Meals",
  "Showers",
];
