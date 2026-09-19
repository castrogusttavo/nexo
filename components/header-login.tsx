import { Muted } from "@/components/typography/text/muted";
import Image from "next/image";
import Link from "next/link";

interface PathProps {
  path: string;
  pathname: string;
  /** Text before the link — the sign-up page asks the opposite question. */
  prompt?: string;
}

export function HeaderLogin({
  path,
  pathname,
  prompt = 'Não tem conta?',
}: PathProps) {
  return (
    <div className='w-full flex items-center justify-between'>
      <Link href='/'>
        <Image
          src='/brand/logo.svg'
          alt='nexo-logo'
          width={71}
          height={20}
          style={{ height: 'auto' }}
          className='invert dark:invert-0'
          priority
        />
      </Link>
      <div className='text-center text-sm'>
        <Muted>
          {prompt}{' '}
          <Link href={path} className='text-primary hover:underline'>
            {pathname}
          </Link>
        </Muted>
      </div>
    </div>
  )
}
