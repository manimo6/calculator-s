import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout.jsx';
import StudentForm from '../components/student/StudentForm.jsx';
import { fetchCourseData } from '../utils/data.js';

const StudentPage = () => {
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const success = await fetchCourseData();
            if (success) {
                setDataLoaded(true);
                return;
            }
            setDataLoaded(false);
        };
        loadData();
    }, []);

    return (
        <Layout>
            {dataLoaded ? (
                <StudentForm />
            ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
                </div>
            )}
        </Layout>
    );

};

export default StudentPage;
