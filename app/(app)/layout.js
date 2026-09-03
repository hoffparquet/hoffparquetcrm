import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="hp-shell">
      <Sidebar />
      <div className="hp-main-col">{children}</div>
    </div>
  );
}
