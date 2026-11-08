export const LEGAL_VERSION='2026-11-08'
export const CONSENT_MESSAGE='请先阅读并同意《用户协议》和《隐私政策》。'
export function consentRecord(at=Date.now()){
 return {version:LEGAL_VERSION,acceptedAt:at,userAgreement:true,privacyPolicy:true}
}
