export type TorontoVerificationSeed = {
  sourceRecordId: string;
  publisher: string;
  title: string;
  url: string;
  fieldsSupported: string[];
  suggested?: {
    phone?: string;
    phoneDisplay?: string;
    website?: string;
    hours?: string;
    intake?: string;
  };
  exclusionReason?: string;
};

// Phase 5B starter research. These are official operator or government pages,
// checked on 2026-07-30. Suggestions remain private and require human
// confirmation before they can be marked directory-ready.
export const torontoVerificationSeeds: TorontoVerificationSeed[] = [
  {
    sourceRecordId: "1027",
    publisher: "Covenant House Toronto",
    title: "Get Help",
    url: "https://covenanthousetoronto.ca/get-help/",
    fieldsSupported: ["operator", "service", "hours", "intake", "phone"],
    suggested: {
      phone: "+14165934849",
      phoneDisplay: "416-593-4849",
      website: "https://covenanthousetoronto.ca/get-help/",
      hours: "Open 24 hours a day, 7 days a week",
      intake: "Youth ages 16–24 can visit 20 Gerrard Street East or call for shelter and support.",
    },
  },
  {
    sourceRecordId: "1015",
    publisher: "Dixon Hall",
    title: "Shelter and Respite Services",
    url: "https://dixonhall.org/shelter-and-respite-services/page/20/",
    fieldsSupported: ["name", "address", "phone", "groups", "services"],
    suggested: {
      phone: "+14166910012",
      phoneDisplay: "416-691-0012",
      website: "https://dixonhall.org/shelter-and-respite-services/page/20/",
      intake: "Call the shelter or Toronto Central Intake before travelling.",
    },
  },
  {
    sourceRecordId: "1025",
    publisher: "Eva's Initiatives for Homeless Youth",
    title: "Get Help",
    url: "https://www.evas.ca/get-help/",
    fieldsSupported: ["name", "phone", "groups", "intake"],
    suggested: {
      phone: "+14163644716",
      phoneDisplay: "416-364-4716",
      website: "https://www.evas.ca/get-help/",
      intake: "Call Eva's Phoenix about transitional housing intake.",
    },
  },
  {
    sourceRecordId: "1024",
    publisher: "Eva's Initiatives for Homeless Youth",
    title: "Get Help",
    url: "https://www.evas.ca/get-help/",
    fieldsSupported: ["name", "phone", "groups", "intake"],
    suggested: {
      phone: "+14164411414",
      phoneDisplay: "416-441-1414",
      website: "https://www.evas.ca/get-help/",
      intake: "Youth ages 16–24 should call Eva's Place for emergency shelter.",
    },
  },
  {
    sourceRecordId: "1023",
    publisher: "Eva's Initiatives for Homeless Youth",
    title: "Get Help",
    url: "https://www.evas.ca/get-help/",
    fieldsSupported: ["name", "phone", "groups", "intake"],
    suggested: {
      phone: "+14162291874",
      phoneDisplay: "416-229-1874",
      website: "https://www.evas.ca/get-help/",
      intake: "Call Eva's Satellite for emergency youth shelter and support.",
    },
  },
  {
    sourceRecordId: "1053",
    publisher: "Fife House",
    title: "Supportive Housing Programs",
    url: "https://www.fifehouse.org/programs-services/",
    fieldsSupported: ["targetPopulation", "programType", "services"],
    exclusionReason: "Health-specific supportive housing is outside HavenNear's general public shelter scope.",
  },
  {
    sourceRecordId: "1054",
    publisher: "Fife House",
    title: "Supportive Housing Programs",
    url: "https://www.fifehouse.org/programs-services/",
    fieldsSupported: ["targetPopulation", "programType", "services"],
    exclusionReason: "Health-specific supportive housing is outside HavenNear's general public shelter scope.",
  },
  {
    sourceRecordId: "1055",
    publisher: "Fred Victor",
    title: "Shelters",
    url: "https://www.fredvictor.org/what-we-do/housing/shelters/",
    fieldsSupported: ["name", "groups", "services", "phone", "intake"],
    suggested: {
      phone: "+14166441743",
      phoneDisplay: "416-644-1743",
      website: "https://www.fredvictor.org/what-we-do/housing/shelters/",
      hours: "Call before travelling",
      intake: "Self-referral by phone, Toronto Central Intake, walk-in if a bed is available, or agency referral.",
    },
  },
  {
    sourceRecordId: "1022",
    publisher: "Good Shepherd Ministries",
    title: "Good Shepherd Toronto",
    url: "https://goodshepherd.ca/",
    fieldsSupported: ["name", "address", "phone", "services"],
    suggested: {
      phone: "+14168693619",
      phoneDisplay: "416-869-3619",
      website: "https://goodshepherd.ca/",
      intake: "Call Good Shepherd or Toronto Central Intake before travelling.",
    },
  },
  {
    sourceRecordId: "1195",
    publisher: "Homes First",
    title: "4117 Lawrence Shelter",
    url: "https://homesfirst.on.ca/hf_property/4117-lawrence/",
    fieldsSupported: ["name", "address", "groups", "services", "intake"],
    suggested: {
      phone: "+14163384766",
      phoneDisplay: "416-338-4766",
      website: "https://homesfirst.on.ca/hf_property/4117-lawrence/",
      hours: "Call Toronto Central Intake before travelling",
      intake: "Adults 18 and older should call 311 or Toronto Central Intake at 416-338-4766.",
    },
  },
  {
    sourceRecordId: "1150",
    publisher: "Homes First",
    title: "2024 Annual Report – Locations",
    url: "https://homesfirst.on.ca/wp-content/uploads/2024/07/Website_Ready_Annual-Report-2024.pdf",
    fieldsSupported: ["name", "address", "operator"],
    suggested: { website: "https://homesfirst.on.ca/", intake: "Call Toronto Central Intake before travelling." },
  },
  {
    sourceRecordId: "1200",
    publisher: "Homes First",
    title: "2024 Annual Report – Locations",
    url: "https://homesfirst.on.ca/wp-content/uploads/2024/07/Website_Ready_Annual-Report-2024.pdf",
    fieldsSupported: ["name", "address", "operator"],
    suggested: { website: "https://homesfirst.on.ca/", intake: "Call Toronto Central Intake before travelling." },
  },
  {
    sourceRecordId: "1031",
    publisher: "Homes First",
    title: "2024 Annual Report – Locations",
    url: "https://homesfirst.on.ca/wp-content/uploads/2024/07/Website_Ready_Annual-Report-2024.pdf",
    fieldsSupported: ["name", "address", "operator"],
    suggested: { website: "https://homesfirst.on.ca/", intake: "Call Toronto Central Intake before travelling." },
  },
  {
    sourceRecordId: "1019",
    publisher: "Horizons for Youth",
    title: "About Us",
    url: "https://horizonsforyouth.org/aboutus",
    fieldsSupported: ["name", "groups", "hours", "services"],
    suggested: {
      phone: "+14167819898",
      phoneDisplay: "416-781-9898",
      website: "https://horizonsforyouth.org/aboutus",
      hours: "24-hour intake, 365 days a year",
      intake: "Youth ages 16–24 can call the shelter for intake.",
    },
  },
  {
    sourceRecordId: "1080",
    publisher: "Kennedy House",
    title: "Kennedy House Youth Shelter",
    url: "https://kennedyhouse.org/services/youth-shelter/",
    fieldsSupported: ["name", "address", "phone", "groups", "services", "intake"],
    suggested: {
      phone: "+14164217776",
      phoneDisplay: "416-421-7776",
      website: "https://kennedyhouse.org/services/youth-shelter/",
      hours: "Call before travelling",
      intake: "Youth ages 16–24 should call the shelter or Toronto Central Intake about an available bed.",
    },
  },
  {
    sourceRecordId: "1066",
    publisher: "City of Toronto",
    title: "4674 Kingston Road",
    url: "https://www.toronto.ca/community-people/housing-shelter/homeless-help/about-torontos-shelter-system/developing-shelter-sites/4674-kingston-rd/",
    fieldsSupported: ["name", "address", "groups", "hours", "services"],
    suggested: {
      phone: "+14163384766",
      phoneDisplay: "416-338-4766",
      website: "https://www.toronto.ca/community-people/housing-shelter/homeless-help/central-intake/",
      hours: "Open 24 hours a day, 7 days a week",
      intake: "Families needing emergency shelter should call Toronto Central Intake before travelling.",
    },
  },
  {
    sourceRecordId: "1360",
    publisher: "City of Toronto",
    title: "705 Progress Avenue Shelter",
    url: "https://www.toronto.ca/news/city-of-toronto-opens-new-shelter-at-705-progress-ave/",
    fieldsSupported: ["name", "address", "groups", "services"],
    suggested: {
      phone: "+14163964613",
      phoneDisplay: "416-396-4613",
      website: "https://www.toronto.ca/community-people/housing-shelter/homeless-help/central-intake/",
      hours: "Open 24 hours a day, 7 days a week",
      intake: "Adults 18 and older should call Toronto Central Intake before travelling.",
    },
  },
  {
    sourceRecordId: "1002",
    publisher: "Na-Me-Res",
    title: "Shelter and Help",
    url: "https://www.nameres.org/housing/shelter-and-help/",
    fieldsSupported: ["name", "address", "groups", "services"],
    suggested: {
      phone: "+18666263737",
      phoneDisplay: "1-866-626-3737",
      website: "https://www.nameres.org/housing/shelter-and-help/",
      intake: "Indigenous men seeking emergency shelter should call Na-Me-Res before travelling.",
    },
  },
  {
    sourceRecordId: "1741",
    publisher: "La Passerelle I.D.É.",
    title: "L'Agapanthe",
    url: "https://www.passerelle-ide.com/en/agapanthe",
    fieldsSupported: ["targetPopulation", "programType", "services"],
    exclusionReason: "Refugee-specific transitional housing is outside HavenNear's public directory scope.",
  },
  {
    sourceRecordId: "1001",
    publisher: "Red Door Family Shelter",
    title: "Who We Are",
    url: "https://www.reddoorshelter.ca/who-we-are/",
    fieldsSupported: ["targetPopulation", "programType", "services"],
    exclusionReason: "The source combines family sheltering with gender-based violence and refugee services; exclude conservatively.",
  },
  {
    sourceRecordId: "1057",
    publisher: "The Salvation Army Ontario",
    title: "Maxwell Meighen Centre",
    url: "https://salvationarmy.ca/ontario/2025/06/from-emergency-shelter-to-stability-at-the-salvation-army-maxwell-meighen-centre/",
    fieldsSupported: ["name", "groups", "services"],
    suggested: {
      website: "https://salvationarmy.ca/ontario/2025/06/from-emergency-shelter-to-stability-at-the-salvation-army-maxwell-meighen-centre/",
      intake: "Call Toronto Central Intake before travelling.",
    },
  },
  {
    sourceRecordId: "1028",
    publisher: "City of Toronto",
    title: "Homelessness Services Resource Inventory",
    url: "https://www.toronto.ca/legdocs/mmis/2025/ec/bgrd/backgroundfile-258384.pdf",
    fieldsSupported: ["name", "address", "groups", "operator"],
    suggested: { intake: "Call Toronto Central Intake before travelling." },
  },
];
