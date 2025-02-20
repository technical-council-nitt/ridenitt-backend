import app from "./src/app"

const port = process.env.PORT || 5173

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`)
})