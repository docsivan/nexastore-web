export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: 0, padding: 0, background: "#0a1628" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        header.sticky { display: none !important; }
        .bg-primary > .container-page { display: none !important; }
        footer { display: none !important; }
      ` }} />
      {children}
    </div>
  );
}
