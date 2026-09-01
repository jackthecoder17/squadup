export type { Candidate, PlayStyle } from "./candidate";
export { groupWait, isCompatible, playStyleCompatible, sharedLanguages } from "./candidate";
export {
  allowedRankSpread,
  allowedRegionDistance,
  DEFAULT_MATCH_CONFIG,
  type MatchConfig,
} from "./config";
export { formMatches, groupFitScore, type MatchGroup } from "./form-matches";
