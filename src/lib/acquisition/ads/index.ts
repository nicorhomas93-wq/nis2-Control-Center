export {
  GOOGLE_CAMPAIGNS,
  GOOGLE_SEARCH_HEADLINES,
  GOOGLE_SEARCH_DESCRIPTIONS,
  GOOGLE_SEARCH_KEYWORDS,
  GOOGLE_NEGATIVE_KEYWORDS,
  buildGoogleRsaCombinations,
} from "./google-ads";
export { LINKEDIN_CAMPAIGNS, LINKEDIN_SINGLE_IMAGE_SPECS } from "./linkedin-ads";
export { AD_CREATIVES, AD_CREATIVE_RULES, RSA_PINNING } from "./creatives";
export {
  RETARGETING_AUDIENCES,
  RETARGETING_MESSAGES,
  buildRetargetingUrl,
  mapAcquisitionToAudience,
} from "./retargeting-audiences";
export {
  PAID_AD_FUNNEL,
  CAMPAIGN_TO_FUNNEL_ENTRY,
  PAID_MEDIA_BUDGET_SPLIT,
  PRIMARY_CONVERSION_ACTIONS,
} from "./funnel-mapping";
