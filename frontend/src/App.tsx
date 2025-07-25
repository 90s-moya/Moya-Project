import './App.css'
import useBearStore from './store/useBearStore'

function App() {
  const bears = useBearStore((state) => state.bears);
  const increase = useBearStore((state) => state.increase);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <h1>Hello, React!</h1><br />
      <h1>Bears: {bears}</h1>
      <button className='bg-blue-100' onClick={() => increase(1)}>+1 Bear made by Shadcn</button>
    </div>
  )
}

export default App
