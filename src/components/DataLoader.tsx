"use client";

import { useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";
import type { Project, Task } from "./widgets/ProjectModal";
import type { BusinessChannel } from "@/types/business";

/**
 * Seeding data for new users or empty localStorage on public site.
 * Extracted from Goals.tsx (for Projects) and Habits.tsx (TODO).
 */
export function DataLoader() {
  useEffect(() => {
    // DataLoader is now empty to avoid pushing generic seeding data to GitHub.
    // Real data is managed locally in the user's browser.
  }, []);
  }, []);

  return null;
}
