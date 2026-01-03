export function createVideoObjectURL(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeVideoObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}
