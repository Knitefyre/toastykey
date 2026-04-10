import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, pageTitle, collapsed = false }) {
  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {/* Header */}
        <Header title={pageTitle} />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
