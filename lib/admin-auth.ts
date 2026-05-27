import { NextRequest } from 'next/server'

export function isAdminAuthed(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}
