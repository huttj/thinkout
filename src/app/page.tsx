import React from 'react';
import { v4 } from 'uuid';
import Link from 'next/link';

export default function Main() {
  return (
    <div className='w-full h-full flex justify-center items-center'>
      <Link href={`/${v4()}`} className='border border-black px-4 p-2 rounded hover:bg-black hover:text-white'>New</Link>
    </div>
  )
}