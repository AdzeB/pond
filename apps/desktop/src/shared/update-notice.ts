export interface UpdateNotice {
  phase: "available" | "downloaded";
  version: string;
  downloading?: boolean;
}

export function updateNoticeCopy(notice: UpdateNotice): {
  title: string;
  description: string;
  action?: "Download" | "Restart";
} {
  if (notice.phase === "downloaded") {
    return {
      title: "Update ready",
      description: `Restart to finish installing Pond ${notice.version}.`,
      action: "Restart",
    };
  }
  if (notice.downloading) {
    return {
      title: "Update available",
      description: `Pond ${notice.version} is downloading.`,
    };
  }
  return {
    title: "Update available",
    description: `Pond ${notice.version} is ready to download.`,
    action: "Download",
  };
}
