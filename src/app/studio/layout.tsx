/**
 * The Studio renders its own complete interface and brings its own styling.
 *
 * This layout deliberately renders nothing but its children: the public
 * site's chrome, typography and global styles must not apply here, and the
 * Studio must not inherit layout constraints meant for the schedule.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
