"use client";

type DashboardOtpGateProps = {
  scope: "manager" | "super_admin";
};

const OTP_DISABLED_FOR_TESTING = true;

export default function DashboardOtpGate(props: DashboardOtpGateProps) {
  void props;
  if (OTP_DISABLED_FOR_TESTING) return null;
  return null;
}
