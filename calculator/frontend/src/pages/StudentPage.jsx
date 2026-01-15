import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout.jsx';
import StudentForm from '../components/student/StudentForm.jsx';
import { fetchCourseData } from '../utils/data.js';

const StudentPage = () => {
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const success = await fetchCourseData();
            if (success) setDataLoaded(true);
        };
        loadData();
    }, []);

    return (
        <Layout>
            {dataLoaded ? (
                <StudentForm />
            ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Loading Data...</div>
            )}
        </Layout>
    );
};

export default StudentPage;
