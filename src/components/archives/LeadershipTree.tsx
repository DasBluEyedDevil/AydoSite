import { FC } from 'react'

interface LeadershipTreeProps {}

interface Leader {
  name: string
  username: string
  title: string
  inGameName?: string
  children?: Leader[]
}

const leadershipData: Leader = {
  name: 'UdonMan',
  username: 'UdonMan',
  title: 'CEO',
  children: [
    {
      name: 'DasBlueEyedDevil',
      username: 'DasBlueEyedDevil',
      title: 'CSO',
    },
    {
      name: 'Kaibo Zaiber',
      username: 'Kaibo_Z',
      title: 'COO',
      inGameName: 'Kaibo Zaiber',
      children: [
        {
          name: 'TBD',
          username: 'TBD',
          title: 'AydoExpress Director',
          children: [
            {
              name: 'Delta Dart',
              username: 'Delta_Dart_42',
              title: 'Manager',
            },
            {
              name: 'Green',
              username: 'MR-GR33N',
              title: 'Manager',
            },
          ],
        },
        {
          name: 'TBD',
          username: 'TBD',
          title: 'Empyrion Industries Director',
          children: [
            {
              name: 'Arc Zero Nine',
              username: 'ArcZeroNine',
              title: 'Manager',
            },
            {
              name: 'Rambo Steph',
              username: 'RamboSteph',
              title: 'Manager',
            },
          ],
        },
      ],
    },
    {
      name: 'Ike Days',
      username: 'IDays',
      title: 'CTO',
      inGameName: 'Ike Days',
    },
  ],
}

const LeaderNode: FC<{ leader: Leader; isRoot?: boolean }> = ({
  leader,
  isRoot = false,
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* Leader card */}
      <div
        className={`bg-white rounded-lg shadow-md p-4 ${
          isRoot ? 'border-2 border-blue-500' : ''
        }`}
      >
        <h3 className="font-semibold text-lg">{leader.title}</h3>
        <p className="text-gray-600">{leader.username}</p>
        {leader.inGameName && (
          <p className="text-sm text-gray-500">({leader.inGameName})</p>
        )}
      </div>

      {/* Children */}
      {leader.children && leader.children.length > 0 && (
        <div className="mt-8">
          {/* Vertical line */}
          <div className="w-0.5 h-8 bg-gray-300 mx-auto" />
          
          {/* Horizontal line for multiple children */}
          {leader.children.length > 1 && (
            <div className="h-0.5 bg-gray-300 w-full" />
          )}
          
          {/* Child nodes */}
          <div className="flex justify-center gap-8 mt-8">
            {leader.children.map((child, index) => (
              <LeaderNode key={child.username + index} leader={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const LeadershipTree: FC<LeadershipTreeProps> = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1000px] p-8">
        <LeaderNode leader={leadershipData} isRoot />
      </div>
    </div>
  )
}

export default LeadershipTree 