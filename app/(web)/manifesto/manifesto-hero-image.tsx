'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import Image from 'next/image'

const ROTATION_DEG = 360

export function ManifestoHeroImage() {
  const { scrollYProgress } = useScroll()
  const rotate = useTransform(scrollYProgress, [0, 1], [0, ROTATION_DEG])

  return (
    <div className='relative mt-6 w-full max-w-4xl overflow-hidden rounded-2xl aspect-2/1'>
      <motion.div
        className='absolute inset-x-0 top-0 w-full aspect-square'
        style={{ rotate }}
      >
        <Image
          src='https://plane.so/manifesto/hero.svg?dpl=dpl_2imyqAGYTXw2hSRUDNE2AWDVjmEN'
          alt='Manifesto illustration'
          width={1200}
          height={1200}
          className='h-full w-full object-contain object-top'
        />
      </motion.div>
    </div>
  )
}
