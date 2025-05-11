import { FC } from 'react'

interface HierarchyChartProps {
  type: 'general' | 'ayoexpress' | 'empyrion'
}

const hierarchyData = {
  general: [
    'Board of Executives',
    'Director',
    'Manager',
    'Supervisor',
    'Senior Employee',
    'Employee',
    'Intern/Freelancer',
  ],
  ayoexpress: [
    'Director',
    'Sub-Director',
    'Overseer',
    'Loadmaster',
    'Senior Service Agent',
    'Service Agent',
    'Associate',
    'Trainee',
  ],
  empyrion: [
    'Director',
    'Sub-Director',
    'Overseer',
    'Specialist',
    'Senior Technician',
    'Technician',
    'Journeyman',
    'Apprentice',
  ],
}

const HierarchyChart: FC<HierarchyChartProps> = ({ type }) => {
  const ranks = hierarchyData[type]

  return (
    <div className="space-y-2">
      {ranks.map((rank, index) => (
        <div
          key={rank}
          className="relative flex items-center"
        >
          {/* Connecting line */}
          {index < ranks.length - 1 && (
            <div className="absolute left-3 top-8 w-0.5 h-8 bg-gray-300" />
          )}
          
          {/* Rank item */}
          <div className="relative flex items-center bg-white rounded-lg shadow-sm p-4 w-full">
            {/* Dot */}
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-4" />
            
            {/* Rank name */}
            <span className="font-medium">{rank}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default HierarchyChart 