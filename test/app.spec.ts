import { expect, test } from "@playwright/test";

const socialLinks = [
  { name: "X (Twitter)", href: "https://x.com/yamaharTech" },
  { name: "GitHub", href: "https://github.com/c19yamamoto" },
  { name: "Zenn", href: "https://zenn.dev/shebang" },
  { name: "Gmail", href: "mailto:c19yamamoto@gmail.com" },
  { name: "connpass", href: "https://connpass.com/user/c19yamamoto/" },
  { name: "AtCoder", href: "https://atcoder.jp/users/c19yamahar" },
  { name: "HackerOne", href: "https://hackerone.com/yamahar1216" },
] as const;

test.describe("profile page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the page metadata and profile image", async ({ page }) => {
    await expect(page).toHaveTitle("c19yamamoto.com");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "c19yamamoto's personal website",
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/profile.jpeg",
    );
    await expect(
      page.getByRole("heading", { name: "c19yamamoto", level: 1 }),
    ).toBeVisible();

    const profileImage = page.getByRole("img", { name: "Profile" });
    await expect(profileImage).toBeVisible();
    await expect
      .poll(() =>
        profileImage.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  });

  test("keeps social links accessible and safe to open", async ({ page }) => {
    const links = page.getByRole("link");
    await expect(links).toHaveCount(socialLinks.length);

    for (const { name, href } of socialLinks) {
      const link = page.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test(
    "respects reduced-motion preferences for the profile shimmer",
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      await expect(page.getByRole("img", { name: "Profile" })).toHaveCSS(
        "animation-name",
        "none",
      );
    },
  );
});
