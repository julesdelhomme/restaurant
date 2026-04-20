type SocialFooterEntry = {
  key: string;
  label: string;
  url: string;
  iconUrl: string;
  iconBg: string;
};

type BuildSocialFooterEntriesArgs = {
  instagramUrl: string;
  facebookUrl: string;
  xUrl: string;
  snapchatUrl: string;
  websiteUrl: string;
};

export function buildSocialFooterEntries({
  instagramUrl,
  facebookUrl,
  xUrl,
  snapchatUrl,
  websiteUrl,
}: BuildSocialFooterEntriesArgs): SocialFooterEntry[] {
  return [
    {
      key: "instagram",
      label: "Instagram",
      url: instagramUrl,
      iconUrl: "https://cdn.simpleicons.org/instagram/E4405F",
      iconBg: "#ffffff",
    },
    {
      key: "facebook",
      label: "Facebook",
      url: facebookUrl,
      iconUrl: "https://cdn.simpleicons.org/facebook/1877F2",
      iconBg: "#ffffff",
    },
    {
      key: "x",
      label: "X",
      url: xUrl,
      iconUrl: "https://cdn.simpleicons.org/x/111111",
      iconBg: "#ffffff",
    },
    {
      key: "snapchat",
      label: "Snapchat",
      url: snapchatUrl,
      iconUrl: "https://cdn.simpleicons.org/snapchat/111111",
      iconBg: "#FFFC00",
    },
    {
      key: "website",
      label: "Web",
      url: websiteUrl,
      iconUrl: "",
      iconBg: "#ffffff",
    },
  ].filter((entry) => entry.url);
}

export type { SocialFooterEntry };
