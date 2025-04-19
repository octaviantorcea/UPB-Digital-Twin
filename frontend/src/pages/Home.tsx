const Home = () => {
    const token = localStorage.getItem("access_token");
  
    return (
      <div style={{ padding: "1rem" }}>
        <h2>Home Page</h2>
        {token ? (
          <p>You're logged in! Token: <code>{token}</code></p>
        ) : (
          <p>You're not logged in.</p>
        )}
      </div>
    );
  };
  
  export default Home;
