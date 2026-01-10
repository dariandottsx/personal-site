import Now from './Now'
import Work from './Work'
import About from './About'
import Contact from './Contact'
import CustomCursor from './CustomCursor'

const Home = () => {
  return (
    <>
      <CustomCursor />
      <section>
        <h1>Darian Pan</h1>
        
        <h2>I build products that help creators and startups turn ideas into momentum.</h2>
        
        <p>And dogfood every bit of it..</p>
      </section>
      
      <Now />
      
      <Work />
      
      <About />
      
      <Contact />
    </>
  )
}

export default Home
