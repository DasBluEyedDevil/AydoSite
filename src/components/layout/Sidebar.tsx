import { FC } from 'react'
import Link from 'next/link'

interface SidebarProps {}

const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Corporate Archives', href: '/corporate-archives' },
  { name: 'Subsidiaries', href: '/subsidiaries' },
  { name: 'Resources', href: '/resources' },
  { name: 'Promotional Pathway', href: '/promotional-pathway' },
  { name: 'Training Guides', href: '/training-guides' },
  { name: 'Certifications', href: '/certifications' },
  { name: 'Employee Database', href: '/employee-database' },
  { name: 'Company Bank', href: '/company-bank' },
]

const Sidebar: FC<SidebarProps> = () => {
  return (
    <div className="bg-primary w-64 min-h-screen p-4">
      <div className="flex items-center justify-center mb-8">
        <h2 className="text-white text-2xl font-bold">Aydo Portal</h2>
      </div>
      <nav>
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="text-gray-300 hover:text-white hover:bg-primary-dark block px-4 py-2 rounded-md transition-colors"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default Sidebar 