import { Muted } from "@/app/_components/typography/text/muted";
import Image from "next/image";
import Link from "next/link";

interface PathProps {
  path: string;
  pathname: string;
}

export function HeaderLogin({ path, pathname }: PathProps) {
  return (
    <div className='w-full flex items-center justify-between'>
      <Link href='/'>
        <Image src='logo.svg' alt='nexo-logo' width={71} height={20} style={{ height: 'auto' }} priority />
      </Link>
      <div className='text-center text-sm'>
        <Muted>
          Não tem conta?{' '}
          <Link href={path} className='text-primary hover:underline'>
            {pathname}
          </Link>
        </Muted>
      </div>
    </div>
  )
}
