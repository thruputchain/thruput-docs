import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sidebar } from "./src/navigation.ts";

export default defineConfig({
  site: "https://docs.groundhog.dev",

  // Keep legacy entry points working as their content is consolidated.
  redirects: {
    "/start": "/architecture/",
    "/tutorials/build-a-swap": "/tutorials/design-a-swap",
  },
  integrations: [
    starlight({
      title: "Groundhog",
      routeMiddleware: "./src/route-middleware.ts",
      customCss: ["./src/styles/custom.css"],
      components: {
        Banner: "./src/components/DocsSnapshotBanner.astro",
        Header: "./src/components/Header.astro",
        Sidebar: "./src/components/Sidebar.astro",
        MobileMenuToggle: "./src/components/MobileMenuToggle.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Footer: "./src/components/Footer.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/groundhogchain",
        },
      ],
      sidebar,
    }),
  ],
});
