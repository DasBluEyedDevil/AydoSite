import { FC } from 'react'

interface CorporateHistoryProps {}

const historyTimeline = [
  {
    year: 2024,
    title: 'Foundation',
    description:
      'Aydo Corporation was established with a vision to revolutionize space logistics and industrial operations.',
  },
  {
    year: 2024,
    title: 'AydoExpress Launch',
    description:
      'The logistics division was formally established to handle interstellar cargo operations.',
  },
  {
    year: 2024,
    title: 'Empyrion Industries Formation',
    description:
      'Industrial operations division created to focus on manufacturing and resource extraction.',
  },
]

const CorporateHistory: FC<CorporateHistoryProps> = () => {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Timeline events */}
      <div className="space-y-8">
        {historyTimeline.map((event, index) => (
          <div key={index} className="relative pl-12">
            {/* Timeline dot */}
            <div className="absolute left-3 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <span className="text-sm text-gray-500">{event.year}</span>
              </div>
              <p className="text-gray-600">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CorporateHistory 