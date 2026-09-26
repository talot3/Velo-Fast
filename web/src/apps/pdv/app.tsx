import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function App() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>VELO FAST · PDV</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Em migração</Button>
        </CardContent>
      </Card>
    </div>
  )
}
