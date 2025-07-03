import React from 'react'

function AuthContainer({children}) {
  return (
    <div className="w-auto min-h-screen flex flex-col items-center justify-start py-10 bg-gradient-to-t from-emerald-200 to-zinc-50">
      {children}
    </div>
  )
}

export default AuthContainer