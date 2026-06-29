/**
 * Erzwingt Desktop-Layout (min. 1280px) mit horizontalem Scroll auf schmalen Viewports.
 */
export function DesktopLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="desktop-scroll-shell w-screen overflow-x-auto">
      <div className="desktop-layout-canvas min-w-[1280px] w-full">{children}</div>
    </div>
  );
}
