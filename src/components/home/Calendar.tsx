import { FC, useState } from 'react'

interface CalendarProps {}

interface Event {
  id: string
  title: string
  date: Date
  type: 'general' | 'ayoexpress' | 'empyrion'
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Friday Night Event',
    date: new Date(2024, 4, 10),
    type: 'general',
  },
  {
    id: '2',
    title: 'AyoExpress Training',
    date: new Date(2024, 4, 12),
    type: 'ayoexpress',
  },
  {
    id: '3',
    title: 'Empyrion Workshop',
    date: new Date(2024, 4, 15),
    type: 'empyrion',
  },
]

const Calendar: FC<CalendarProps> = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'general':
        return 'bg-blue-500'
      case 'ayoexpress':
        return 'bg-yellow-500'
      case 'empyrion':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'h-96' : 'h-64'}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            <span className="text-sm">General</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
            <span className="text-sm">AyoExpress</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            <span className="text-sm">Empyrion</span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="space-y-2">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center p-2 rounded-md hover:bg-gray-50"
          >
            <div
              className={`w-3 h-3 rounded-full mr-3 ${getEventTypeColor(
                event.type
              )}`}
            />
            <div>
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-gray-500">
                {event.date.toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Calendar 