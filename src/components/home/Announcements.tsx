import { FC } from 'react'
import Image from 'next/image'

interface AnnouncementsProps {}

interface Announcement {
  id: string
  title: string
  content: string
  date: Date
  priority: 'high' | 'medium' | 'low'
}

interface EmployeeOfTheMonth {
  username: string
  achievement: string
  avatarUrl: string
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'New Security Protocols',
    content: 'Updated security measures for all facilities. Please review the new guidelines.',
    date: new Date(2024, 4, 1),
    priority: 'high',
  },
  {
    id: '2',
    title: 'Quarterly Meeting',
    content: 'Join us for the Q2 company-wide meeting next week.',
    date: new Date(2024, 4, 5),
    priority: 'medium',
  },
]

const employeeOfTheMonth: EmployeeOfTheMonth = {
  username: 'DasBlueEyedDevil',
  achievement: 'Outstanding leadership in system security implementation',
  avatarUrl: '/images/employee-of-month.jpg',
}

const Announcements: FC<AnnouncementsProps> = () => {
  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee of the Month */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-4 text-white">
        <h3 className="text-lg font-semibold mb-2">Employee of the Month</h3>
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <Image
              src={employeeOfTheMonth.avatarUrl}
              alt={employeeOfTheMonth.username}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-medium">{employeeOfTheMonth.username}</p>
            <p className="text-sm opacity-90">{employeeOfTheMonth.achievement}</p>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {mockAnnouncements.map((announcement) => (
          <div
            key={announcement.id}
            className={`border-l-4 bg-white p-4 rounded-r-lg ${getPriorityColor(
              announcement.priority
            )}`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium">{announcement.title}</h3>
              <span className="text-sm text-gray-500">
                {announcement.date.toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{announcement.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Announcements 