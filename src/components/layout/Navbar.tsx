import { FC } from 'react'

interface NavbarProps {}

const Navbar: FC<NavbarProps> = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">
              Welcome Back, [Username]!
            </h1>
          </div>
          <div className="flex items-center">
            {/* Add notification bell, profile dropdown, etc. here */}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 