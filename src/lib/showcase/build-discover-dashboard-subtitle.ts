export function formatBuildDiscoverDashboardSubtitle(options: {
  totalLikes: number;
  unreadLikes: number;
  demoMode?: boolean;
  demoSubtitle?: string | null;
}): string {
  if (options.demoMode) {
    return options.demoSubtitle?.trim() || "Community-Builds live";
  }

  const total = Math.max(0, Math.floor(options.totalLikes));
  const unread = Math.max(0, Math.floor(options.unreadLikes));

  const totalLabel =
    total === 1
      ? "1 Like gesamt"
      : total > 0
        ? `${total.toLocaleString("de-DE")} Likes gesamt`
        : null;

  if (totalLabel) {
    if (unread > 0) {
      const unreadLabel =
        unread === 1
          ? "1 neu"
          : `${unread.toLocaleString("de-DE")} neu`;
      return `${unreadLabel} · ${totalLabel}`;
    }
    return totalLabel;
  }

  if (unread > 0) {
    return unread === 1 ? "1 neuer Like" : `${unread.toLocaleString("de-DE")} neue Likes`;
  }

  return "Swipe · öffentliche Builds";
}
