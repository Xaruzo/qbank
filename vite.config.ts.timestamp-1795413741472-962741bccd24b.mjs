// vite.config.ts
import { defineConfig } from "file:///app/applet/node_modules/vitest/dist/config.js";
import react from "file:///app/applet/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///app/applet/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tiptap/core",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-color",
      "@tiptap/extension-highlight",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-task-item",
      "@tiptap/extension-task-list",
      "@tiptap/extension-text-align",
      "@tiptap/extension-text-style",
      "fabric",
      "katex",
      "lucide-react",
      "@supabase/supabase-js",
      "react-markdown",
      "remark-gfm",
      "remark-math",
      "remark-breaks",
      "rehype-katex",
      "three"
    ]
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{js,ts}"]
  },
  build: {
    target: "es2020",
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    minify: "esbuild",
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("three")) return "vendor-three";
            if (id.includes("fabric")) return "vendor-fabric";
            if (id.includes("katex")) return "vendor-katex";
            if (id.includes("react-markdown") || id.includes("remark") || id.includes("rehype") || id.includes("micromark") || id.includes("unist") || id.includes("mdast") || id.includes("vfile") || id.includes("property-information") || id.includes("hast")) {
              return "vendor-markdown";
            }
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
              return "vendor-react";
            }
          }
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3e3,
    allowedHosts: true,
    headers: {
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; base-uri 'self';",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwL2FwcGxldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gXCJAdGFpbHdpbmRjc3Mvdml0ZVwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIHRhaWx3aW5kY3NzKCldLFxuICByZXNvbHZlOiB7XG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgXCJyZWFjdFwiLFxuICAgICAgXCJyZWFjdC1kb21cIixcbiAgICAgIFwicmVhY3QtZG9tL2NsaWVudFwiLFxuICAgICAgXCJyZWFjdC9qc3gtcnVudGltZVwiLFxuICAgICAgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIixcbiAgICAgIFwiQHRpcHRhcC9jb3JlXCIsXG4gICAgICBcIkB0aXB0YXAvcmVhY3RcIixcbiAgICAgIFwiQHRpcHRhcC9zdGFydGVyLWtpdFwiLFxuICAgICAgXCJAdGlwdGFwL2V4dGVuc2lvbi1jb2xvclwiLFxuICAgICAgXCJAdGlwdGFwL2V4dGVuc2lvbi1oaWdobGlnaHRcIixcbiAgICAgIFwiQHRpcHRhcC9leHRlbnNpb24tcGxhY2Vob2xkZXJcIixcbiAgICAgIFwiQHRpcHRhcC9leHRlbnNpb24tdGFzay1pdGVtXCIsXG4gICAgICBcIkB0aXB0YXAvZXh0ZW5zaW9uLXRhc2stbGlzdFwiLFxuICAgICAgXCJAdGlwdGFwL2V4dGVuc2lvbi10ZXh0LWFsaWduXCIsXG4gICAgICBcIkB0aXB0YXAvZXh0ZW5zaW9uLXRleHQtc3R5bGVcIixcbiAgICAgIFwiZmFicmljXCIsXG4gICAgICBcImthdGV4XCIsXG4gICAgICBcImx1Y2lkZS1yZWFjdFwiLFxuICAgICAgXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIixcbiAgICAgIFwicmVhY3QtbWFya2Rvd25cIixcbiAgICAgIFwicmVtYXJrLWdmbVwiLFxuICAgICAgXCJyZW1hcmstbWF0aFwiLFxuICAgICAgXCJyZW1hcmstYnJlYWtzXCIsXG4gICAgICBcInJlaHlwZS1rYXRleFwiLFxuICAgICAgXCJ0aHJlZVwiLFxuICAgIF0sXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBlbnZpcm9ubWVudDogXCJub2RlXCIsXG4gICAgaW5jbHVkZTogW1widGVzdHMvKiovKi50ZXN0Lntqcyx0c31cIl0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiBcImVzMjAyMFwiLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTIwMCxcbiAgICBtaW5pZnk6IFwiZXNidWlsZFwiLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG1heFBhcmFsbGVsRmlsZU9wczogMixcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInRocmVlXCIpKSByZXR1cm4gXCJ2ZW5kb3ItdGhyZWVcIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcImZhYnJpY1wiKSkgcmV0dXJuIFwidmVuZG9yLWZhYnJpY1wiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwia2F0ZXhcIikpIHJldHVybiBcInZlbmRvci1rYXRleFwiO1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcInJlYWN0LW1hcmtkb3duXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwicmVtYXJrXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwicmVoeXBlXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwibWljcm9tYXJrXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwidW5pc3RcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJtZGFzdFwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcInZmaWxlXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwicHJvcGVydHktaW5mb3JtYXRpb25cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJoYXN0XCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1hcmtkb3duXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJsdWNpZGUtcmVhY3RcIikpIHJldHVybiBcInZlbmRvci1pY29uc1wiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHN1cGFiYXNlXCIpKSByZXR1cm4gXCJ2ZW5kb3Itc3VwYWJhc2VcIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInJlYWN0XCIpIHx8IGlkLmluY2x1ZGVzKFwicmVhY3QtZG9tXCIpIHx8IGlkLmluY2x1ZGVzKFwic2NoZWR1bGVyXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1yZWFjdFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgcG9ydDogMzAwMCxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXG4gICAgaGVhZGVyczoge1xuICAgICAgXCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiOlxuICAgICAgICBcImRlZmF1bHQtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgJ3Vuc2FmZS1ldmFsJyBkYXRhOiBibG9iOiBodHRwczo7IGltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6IGh0dHBzOjsgZm9udC1zcmMgJ3NlbGYnIGh0dHBzOi8vZm9udHMuZ3N0YXRpYy5jb20gZGF0YTo7IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczogd3NzOjsgYmFzZS11cmkgJ3NlbGYnO1wiLFxuICAgICAgXCJYLUNvbnRlbnQtVHlwZS1PcHRpb25zXCI6IFwibm9zbmlmZlwiLFxuICAgICAgXCJSZWZlcnJlci1Qb2xpY3lcIjogXCJzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luXCIsXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtTixTQUFTLG9CQUFvQjtBQUNoUCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsRUFDL0I7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFNBQVMsQ0FBQyx5QkFBeUI7QUFBQSxFQUNyQztBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsc0JBQXNCO0FBQUEsSUFDdEIsdUJBQXVCO0FBQUEsSUFDdkIsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2Isb0JBQW9CO0FBQUEsTUFDcEIsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLGdCQUFJLEdBQUcsU0FBUyxPQUFPLEVBQUcsUUFBTztBQUNqQyxnQkFBSSxHQUFHLFNBQVMsUUFBUSxFQUFHLFFBQU87QUFDbEMsZ0JBQUksR0FBRyxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQ2pDLGdCQUNFLEdBQUcsU0FBUyxnQkFBZ0IsS0FDNUIsR0FBRyxTQUFTLFFBQVEsS0FDcEIsR0FBRyxTQUFTLFFBQVEsS0FDcEIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLE9BQU8sS0FDbkIsR0FBRyxTQUFTLE9BQU8sS0FDbkIsR0FBRyxTQUFTLE9BQU8sS0FDbkIsR0FBRyxTQUFTLHNCQUFzQixLQUNsQyxHQUFHLFNBQVMsTUFBTSxHQUNsQjtBQUNBLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQUN4QyxnQkFBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsZ0JBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsV0FBVyxLQUFLLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDaEYscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLFNBQVM7QUFBQSxNQUNQLDJCQUNFO0FBQUEsTUFDRiwwQkFBMEI7QUFBQSxNQUMxQixtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
