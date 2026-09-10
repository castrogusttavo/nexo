import Image from 'next/image'
import { LogosCarousel } from '@/components/logos-carousel'
import { Muted } from '@/components/typography/text/muted'

const LOGOS = ['amazon', 'sony', 'accenture', 'dolby', 'rebiclique-francaise']

export function CustomersLogosCarousel() {
  return (
    <section className='flex items-center text-start justify-between mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16'>
      <Muted>
        Join 50,000+ teams <br />
        that actually enjoy work
      </Muted>
      <LogosCarousel>
        {LOGOS.map((logo) => (
          <Image
            key={logo}
            src={`/customers/${logo}.svg`}
            alt={logo}
            width={190}
            height={56}
            className='w-auto object-contain grayscale opacity-70 dark:invert'
          />
        ))}
      </LogosCarousel>
    </section>
  )
}
