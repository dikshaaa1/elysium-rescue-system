import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';

import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import AppNewsUpdate from '../app-news-update';
import AppCurrentVisits from '../app-current-visits';
import AppWebsiteVisits from '../app-website-visits';
import AppWidgetSummary from '../app-widget-summary';
import AppConversionRates from '../app-conversion-rates';

let coverCounter = 1; // Counter to track cover numbers

export default function AppView() {
  const [userData, setUserData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [sosData, setSosData] = useState([]); // For SOS section
  const router = useRouter();

  useEffect(() => {
    // Retrieve user data from cookie
    const storedUser = Cookies.get('user');

    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }

    // Fetch the data from the /service/getx endpoint (Request Details)
    async function fetchNewsData() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}service/getx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Map the data and limit to 3 items
          const mappedData = data.slice(0, 3).map((item, index) => {
            const coverNumber = coverCounter;
            coverCounter = coverCounter >= 24 ? 1 : coverCounter + 1;

            const title =
              item.location && item.location !== 'Not Specified'
                ? `${item.poster} has posted about ${item.problem} at ${item.location}`
                : `${item.poster} has posted about ${item.problem}`;

            return {
              id: (index + 1).toString(),
              title,
              description: item.text,
              image: `/assets/images/covers/cover_${coverNumber}.jpg`,
              link: item.images && item.images.length > 0 ? item.images[0] : '',
              postedAt: item.date,
            };
          });

          setNewsData(mappedData);
        } else {
          console.error('Failed to fetch data:', response.status);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    // Fetch the data from the /service/getsos endpoint (SOS Details)
    async function fetchSosData() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}service/getsos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Map the data and limit to 3 items
          const mappedData = data.slice(0, 3).map((item, index) => {
            const coverNumber = coverCounter;
            coverCounter = coverCounter >= 24 ? 1 : coverCounter + 1;

            return {
              id: (index + 1).toString(),
              title: `${item.sosType} at Lat: ${
                item.lastLoc.coordinates[1] || 'Unknown latitude'
              }, Long: ${item.lastLoc.coordinates[0] || 'Unknown longitude'}`, // Template literal with formatted coordinates
              description: item.text,
              image: `/assets/images/covers/cover_${coverNumber}.jpg`,
              link: item.images && item.images.length > 0 ? item.images[0] : '',
              postedAt: item.date,
            };
          });

          setSosData(mappedData);
        } else {
          console.error('Failed to fetch SOS data:', response.status);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchNewsData();
    fetchSosData();
  }, []);

  if (!userData) {
    router.push('/login'); // Redirect if no user data
    return <div />;
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Hi, Welcome back 👋 {userData.servicename}!
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total Service Completed"
            total={userData.totalServiceCompleted}
            color="success"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_bag.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Service Completed Today"
            total={userData.serviceCompletedToday}
            color="info"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_users.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Running Services"
            total={userData.runningServices.count}
            color="warning"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_buy.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Pending Services"
            total={userData.pendingServices.count}
            color="error"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_message.png" />}
          />
        </Grid>

        <Grid xs={6} md={3} lg={4}>
          <Grid xs={6} md={3} lg={4}>
            <AppNewsUpdate
              title="Request Details"
              list={newsData} // Render mapped news data
            />
          </Grid>
          <Grid xs={6} md={3} lg={4}>
            <AppNewsUpdate
              title="SOS"
              list={sosData} // Render SOS data
            />
          </Grid>
        </Grid>

        {/* <Grid xs={6} md={9} lg={8}>
          <iframe
            src={`https://www.google.com/maps/embed?pb=!4v${new Date().getTime()}!6m8!1m7!1s${latitude},${longitude}!2m2!1d${latitude}!2d${longitude}!3f299.8245!4f0!5f0.7820865974627469`}
            width="800"
            height="500"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Google Maps Street View"
          />
        </Grid> */}

        <Grid xs={12} md={6} lg={8}>
          <AppWebsiteVisits
            title="Best Performers"
            subheader="(+43%) than last year"
            chart={{
              labels: [
                '01/01/2024',
                '02/01/2024',
                '03/01/2024',
                '04/01/2024',
                '05/01/2024',
                '06/01/2024',
                '07/01/2024',
                '08/01/2024',
                '09/01/2024',
                '10/01/2024',
                '11/01/2024',
              ],
              series: [
                {
                  name: 'Team A',
                  type: 'column',
                  fill: 'solid',
                  data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30],
                },
                {
                  name: 'Team B',
                  type: 'area',
                  fill: 'gradient',
                  data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43],
                },
                {
                  name: 'Team C',
                  type: 'line',
                  fill: 'solid',
                  data: [30, 25, 36, 30, 45, 35, 64, 52, 59, 36, 39],
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
          <AppCurrentVisits
            title="Current Visits"
            chart={{
              series: [
                { label: 'Team A', value: 4344 },
                { label: 'Team B', value: 5435 },
                { label: 'Team C', value: 1443 },
                { label: 'Team D', value: 4443 },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={12} lg={12}>
          <AppConversionRates
            title="Records"
            subheader="(+43%) than last year"
            chart={{
              series: [
                { label: 'Present', value: 2 },
                { label: 'Future', value: 2 },
                { label: 'Past', value: 10 },
              ],
            }}
          />
        </Grid>
      </Grid>
    </Container>
  );
}
