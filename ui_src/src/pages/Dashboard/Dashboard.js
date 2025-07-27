import React from 'react';

const Dashboard = () => {
    return (
        <div className="container-fluid">
            <h1>Dashboard</h1>
            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">Welcome</h5>
                            <p className="card-text">Select an option from the menu.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;