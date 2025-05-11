import { FC } from 'react'
import Image from 'next/image'
import Calendar from '@/components/home/Calendar'
import Announcements from '@/components/home/Announcements'
import ImageCarousel from '@/components/home/ImageCarousel'

const HomePage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Image Carousel */}
      <div className="mb-8">
        <ImageCarousel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upcoming Events Calendar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
          <Calendar />
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Announcements</h2>
          <Announcements />
        </div>
      </div>
    </div>
  )
}

export default HomePage 