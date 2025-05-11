import { FC } from 'react'
import CorporateHistory from '@/components/archives/CorporateHistory'
import HierarchyChart from '@/components/archives/HierarchyChart'
import LeadershipTree from '@/components/archives/LeadershipTree'
import PayscaleTable from '@/components/archives/PayscaleTable'

const CorporateArchivesPage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Corporate Archives</h1>
      
      <div className="space-y-12">
        {/* Corporate History Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Corporate History</h2>
          <CorporateHistory />
        </section>

        {/* Hierarchy Charts Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Organization Hierarchy</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-medium mb-3">General Ranks</h3>
              <HierarchyChart type="general" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-3">Subsidiary Ranks</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-2">AydoExpress</h4>
                  <HierarchyChart type="ayoexpress" />
                </div>
                <div>
                  <h4 className="text-lg font-medium mb-2">Empyrion Industries</h4>
                  <HierarchyChart type="empyrion" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership Tree Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Current Leadership Structure</h2>
          <LeadershipTree />
        </section>

        {/* Payscale Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Interactive Payscale</h2>
          <PayscaleTable />
        </section>
      </div>
    </div>
  )
}

export default CorporateArchivesPage 