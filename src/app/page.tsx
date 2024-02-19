import React from 'react';
import { v4 } from 'uuid';
import Link from 'next/link';

export default function Main() {
  return (
    <div className='w-full h-full flex justify-center items-center'>
      <Link href={`/${v4()}`} className='border border-black dark:border-white px-4 p-2 rounded hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black'>New</Link>
    </div>
  )
}