import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { fToNow } from 'src/utils/format-time';

import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export default function AppNewsUpdate({
  title,
  subheader,
  list,
  onClick,
  onDoubleClick,
  ...other
}) {
  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      {/* Wrapping Stack in Scrollbar with a fixed height */}
      <Scrollbar>
        <Stack
          spacing={3}
          sx={{ p: 3, pr: 0, maxHeight: 300, overflowY: 'auto' }} // Set maxHeight for limiting visible items
        >
          {list.map((news) => (
            <NewsItem
              key={news.id}
              news={news}
              onClick={() => onClick(news)}
              onDoubleClick={() => onDoubleClick(news)} // Added onDoubleClick handler
            />
          ))}
        </Stack>
      </Scrollbar>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 2, textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
        >
          View all
        </Button>
      </Box>
    </Card>
  );
}

AppNewsUpdate.propTypes = {
  title: PropTypes.string,
  subheader: PropTypes.string,
  list: PropTypes.array.isRequired,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func, // Add this line
};

// ----------------------------------------------------------------------

function NewsItem({ news, onClick, onDoubleClick }) {
  const { image, title, description, postedAt } = news;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      onClick={onClick}
      onDoubleClick={onDoubleClick} // Handle double-click event
    >
      <Box
        component="img"
        alt={title}
        src={image}
        sx={{ width: 48, height: 48, borderRadius: 1.5, flexShrink: 0 }}
      />

      <Box sx={{ minWidth: 240, flexGrow: 1 }}>
        <Link color="inherit" variant="subtitle2" underline="hover" Wrap>
          {title}
        </Link>

        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {description}
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ pr: 2, pt: 2, flexShrink: 0, color: 'text.secondary' }}>
        {fToNow(postedAt)}
      </Typography>
    </Stack>
  );
}

NewsItem.propTypes = {
  news: PropTypes.shape({
    image: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    postedAt: PropTypes.instanceOf(Date),
  }),
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func, // Add this line
};
