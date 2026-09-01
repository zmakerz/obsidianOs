export interface WikiPromotionCandidate {
  sourceCount: number;
  extendsExistingWiki: boolean;
  reusableAcrossWork: boolean;
  stableConcept: boolean;
  onlyNeededForOneArticle: boolean;
}
export interface PromotionDecision { promote: boolean; reasons: string[] }

export function decideWikiPromotion(candidate: WikiPromotionCandidate): PromotionDecision {
  const reasons: string[] = [];
  if (candidate.extendsExistingWiki) reasons.push("기존 Wiki를 확장합니다.");
  if (candidate.sourceCount >= 2) reasons.push("여러 출처를 연결합니다.");
  if (candidate.reusableAcrossWork) reasons.push("여러 업무에서 재사용됩니다.");
  if (candidate.stableConcept) reasons.push("반복 참조할 안정적인 개념입니다.");

  const reusable = candidate.extendsExistingWiki || candidate.sourceCount >= 2 || candidate.reusableAcrossWork || candidate.stableConcept;
  if (candidate.onlyNeededForOneArticle && !reusable) {
    return { promote: false, reasons: ["현재 Article만으로 충분합니다."] };
  }
  return { promote: reusable, reasons: reusable ? reasons : ["승격 근거가 아직 부족합니다."] };
}
