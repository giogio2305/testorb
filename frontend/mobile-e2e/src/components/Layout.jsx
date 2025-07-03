import Navigation from './navigation/Navigation';
import ProfileMenu from './navigation/ProfileMenu';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <nav className="bg-white shadow-sm w-full sticky top-0 z-50">
        <div className="w-full mx-auto px-10">
          <div className="flex justify-between h-16">
            <Navigation />
            <div className="flex items-center">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}