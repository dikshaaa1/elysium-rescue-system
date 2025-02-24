import Cookies from 'js-cookie';
import WorldMap from 'react-svg-worldmap';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Modal from '@mui/material/Modal';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';

import MapChart from '../MapChart';
import AppNewsUpdate from '../app-news-update';
import AppCurrentVisits from '../app-current-visits';
import AppWebsiteVisits from '../app-website-visits';
import AppWidgetSummary from '../app-widget-summary';
import AppConversionRates from '../app-conversion-rates';
import { AnalyticsTrafficBySite } from '../analytics-traffic-by-site';

let coverCounter = 1; // Counter to track cover numbers

export default function AppView() {
  const Mapdata = [
    { country: 'ph', value: 468200000 },
    { country: 'in', value: 423100000 },
    { country: 'id', value: 414600000 },
    { country: 'co', value: 383700000 },
    { country: 'mx', value: 375500000 },
    { country: 'mm', value: 354900000 },
    { country: 'mz', value: 343700000 },
    { country: 'ch', value: 287000000 },
    { country: 'bd', value: 279000000 },
    { country: 'pk', value: 267500000 },
    { country: 'ru', value: 265400000 },
    { country: 'ca', value: 189900000 },
    { country: 'nz', value: 130500000 },
    { country: 'dz', value: 95800000 },
    { country: 'fj', value: 65200000 },
  ];

  const [userData, setUserData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [sosData, setSosData] = useState([]); // For SOS section
  const [selectedLocation, setSelectedLocation] = useState({ lat: 0, lng: 0 }); // To store selected location
  const [selectedImage, setSelectedImage] = useState(''); // To store selected image
  const [selectedItem, setSelectedItem] = useState(null); // State to store selected item
  const [modalOpen, setModalOpen] = useState(false); // State to handle modal visibility
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
          const mappedData = data.slice(0, data.length).map((item, index) => {
            const coverNumber = coverCounter;
            coverCounter = coverCounter >= 24 ? 1 : coverCounter + 1;

            const title =
              item.location && item.location !== 'Not specified'
                ? `${item.poster} has posted about ${item.problem} at ${item.location}`
                : `${item.poster} has posted about ${item.problem}`;

            return {
              id: (index + 1).toString(),
              title,
              description: item.text,
              image: `/assets/images/covers/cover_${coverNumber}.jpg`,
              link: item.link,
              postedAt: item.date,
              imageLink: item.images[0],
              author: item.poster,
              problem: item.problem,
              location: item.location,
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
          const mappedData = data.slice(0, data.length).map((item, index) => {
            const coverNumber = coverCounter;
            coverCounter = coverCounter >= 24 ? 1 : coverCounter + 1;

            return {
              id: (index + 1).toString(),
              title: `${item.sosType} at Lat: ${
                item.lastLoc.coordinates[1] || 'Unknown latitude'
              }, Long: ${item.lastLoc.coordinates[0] || 'Unknown longitude'}`, // Template literal with formatted coordinates
              description: item.sosType,
              image: `/assets/images/covers/cover_${coverNumber}.jpg`,
              imageLink: item.picture,
              link: `https://www.google.com/maps/place/${item.lastLoc.coordinates[1]},${item.lastLoc.coordinates[0]}`,
              postedAt: item.date,
              lastLoc: [item.lastLoc.coordinates[0], item.lastLoc.coordinates[1]],
              phoneNumber: item.phone.$numberLong,
              email: item.email,
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

  const handleItemClick = (item) => {
    if (item.lastLoc) {
      setSelectedLocation({
        lat: item.lastLoc[1] || 0,
        lng: item.lastLoc[0] || 0,
      });
    } else {
      setSelectedLocation({
        lat: 0,
        lng: 0,
      });
      setSelectedImage(item.imageLink || '/assets/images/products/No_image_available.svg'); // Set image if location is not available
    }
    setSelectedItem(item); // Store the selected item
  };

  // Handle item double-click
  const handleItemDoubleClick = (item) => {
    handleItemClick(item);
    setModalOpen(true);
    console.log(item);
  };

  // Close modal function
  const handleCloseModal = () => {
    setModalOpen(false); // Close the modal
    setSelectedItem(null); // Clear selected item
  };

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

        <Grid xs={12} md={6} lg={4}>
          <Grid xs={12} md={6} lg={4}>
            <AppNewsUpdate
              title="Request Details"
              list={newsData}
              onClick={handleItemClick}
              onDoubleClick={handleItemDoubleClick}
            />
          </Grid>

          <Grid xs={12} md={6} lg={4}>
            <AppNewsUpdate
              title="SOS"
              list={sosData}
              onClick={handleItemClick}
              onDoubleClick={handleItemDoubleClick}
            />
          </Grid>
        </Grid>
        <Modal
          open={modalOpen}
          onClose={handleCloseModal}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Card
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 800,
              maxWidth: '90%',
              boxShadow: 24,
              p: 4,
            }}
          >
            {selectedItem && (
              <>
                <Box display="flex" gap={2} mb={2}>
                  {selectedItem.imageLink !== '' && (
                    <Box sx={{ flex: 1, height: 400 }}>
                      <CardMedia
                        component="img"
                        height="400"
                        image={
                          selectedItem.imageLink || '/assets/images/products/No_image_available.svg'
                        }
                        alt={selectedItem.title}
                        sx={{
                          objectFit: 'contain', // Ensure the entire image fits within the height
                          height: '100%', // Make sure the image fills the height of the container
                          width: '100%', // Ensure the image stretches to fill the width of the container
                        }}
                      />
                    </Box>
                  )}

                  {selectedLocation.lat !== 0 && selectedLocation.lng !== 0 && (
                    <Box sx={{ flex: 1 }}>
                      <iframe
                        src={`https://www.google.com/maps/embed?pb=!4v${new Date().getTime()}!6m8!1m7!1s${
                          selectedLocation.lat
                        },${selectedLocation.lng}!2m2!1d${selectedLocation.lat}!2d${
                          selectedLocation.lng
                        }!3f299.8245!4f0!5f0.7820865974627469`}
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        title="Google Maps Street View"
                      />
                    </Box>
                  )}
                </Box>

                <CardContent>
                  <Typography id="modal-modal-title" variant="h5" style={{ paddingBottom: '10px' }}>
                    <a
                      href={selectedItem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: 'underline',
                        color: 'inherit', // This ensures the text color remains the same as Typography
                      }}
                    >
                      {selectedItem.title}
                    </a>
                  </Typography>

                  <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Description:
                    </Typography>
                    <Typography variant="body2">{selectedItem.description}</Typography>

                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? 'Location:'
                        : 'Location:'}
                    </Typography>
                    <Typography variant="body2">
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? `${selectedLocation.lat}, ${selectedLocation.lng}`
                        : selectedItem.location}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? 'Phone Number:'
                        : 'Problem:'}
                    </Typography>
                    <Typography variant="body2">
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? selectedItem.phoneNumber
                        : selectedItem.problem}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? 'Email:'
                        : 'Author:'}
                    </Typography>
                    <Typography variant="body2">
                      {selectedLocation.lat !== 0 && selectedLocation.lng !== 0
                        ? selectedItem.email
                        : selectedItem.author}
                    </Typography>
                  </Box>
                </CardContent>

                <IconButton
                  aria-label="close"
                  onClick={handleCloseModal}
                  sx={{ position: 'absolute', top: 10, right: 10 }}
                >
                  <CloseIcon />
                </IconButton>
              </>
            )}
          </Card>
        </Modal>
        <Grid xs={12} md={12} lg={8}>
          {selectedLocation.lat !== 0 && selectedLocation.lng !== 0 ? (
            <iframe
              src={`https://www.google.com/maps/embed?pb=!4v${new Date().getTime()}!6m8!1m7!1s${
                selectedLocation.lat
              },${selectedLocation.lng}!2m2!1d${selectedLocation.lat}!2d${
                selectedLocation.lng
              }!3f299.8245!4f0!5f0.7820865974627469`}
              width="800"
              height="600"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Google Maps Street View"
            />
          ) : (
            <iframe
              src={selectedImage}
              width="800"
              height="600"
              style={{ border: 0 }}
              loading="lazy"
              title="Tweet Image"
            />
          )}
        </Grid>

        <Grid xs={6} md={6} lg={6}>
          <div className="App">
            <WorldMap
              color="#1877f2"
              title="Most Disastrous Regions"
              value-suffix="people"
              size="xl"
              data={Mapdata}
            />
          </div>
        </Grid>

        <Grid xs={6} md={6} lg={6}>
          <div style={{ position: 'relative' }}>
            <MapChart style={{ position: 'absolute', height: '50px', width: '50px' }} />
          </div>
        </Grid>

        <Grid xs={12} md={6} lg={8}>
          <AppWebsiteVisits
            title="Disaster's Frequency and Severity"
            subheader="(+10%) than last year"
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
                  name: 'Floods',
                  type: 'column',
                  fill: 'solid',
                  data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30],
                },
                {
                  name: 'Earthquakes',
                  type: 'area',
                  fill: 'gradient',
                  data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43],
                },
                {
                  name: 'Landslides',
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
            title="Disasters Per State"
            chart={{
              series: [
                { label: 'Uttar Pradesh', value: 7000 },
                { label: 'Bihar', value: 6000 },
                { label: 'West Bengal', value: 5000 },
                { label: 'Assam', value: 4500 },
                { label: 'Maharashtra', value: 4500 },
                { label: 'Odisha', value: 4000 },
                { label: 'Tamil Nadu', value: 3500 },
                { label: 'Gujarat', value: 3400 },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
          <AnalyticsTrafficBySite
            title="Traffic by site"
            list={[
              { value: 'facebook', label: 'Facebook', total: 32 },
              { value: 'google', label: 'Google', total: 34 },
              { value: 'instagram', label: 'Instagram', total: 41 },
              { value: 'twitter', label: 'Twitter', total: 44 },
            ]}
          />
        </Grid>

        <Grid xs={12} md={6} lg={8}>
          <AppConversionRates
            title="Death Counts"
            subheader="(-22%) than last year"
            chart={{
              series: [
                { label: 'States Without NDRF', value: 20 },
                { label: 'States With NDRF', value: 5 },
              ],
            }}
          />
        </Grid>
      </Grid>
    </Container>
  );
}
