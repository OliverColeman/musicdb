import React from 'react';
import { createContainer } from 'meteor/react-meteor-data';
import { ButtonToolbar, ButtonGroup, Button, Alert, DropdownButton, SplitButton, MenuItem } from 'react-bootstrap';

import './Pager.scss';


class Pager extends React.Component {
  constructor(props) {
    super(props);

    this.flip = this.flip.bind(this);
  }


  render() {
    const { start, limit, itemCount, onLimitChange } = this.props;
    //if (!itemCount) return null;
    const limits = [5, 10, 20, 50, 100];
    return (
      <div className="Pager"><ButtonToolbar>
        <ButtonGroup bsSize="medium">
            <Button onClick={() => this.flip(-2)} disabled={start == 0}>⏮</Button>
            <Button onClick={() => this.flip(-1)} disabled={start == 0}>⏪</Button>
              <DropdownButton
                title={ (itemCount == 0 ? 0 : start + 1) + " - " + Math.min(start + limit, itemCount) + " / " + itemCount }
                id="pager-limit-select"
              >
                { limits.map(lim => (
                  <MenuItem onClick={ () => onLimitChange(lim) } key={lim}>
                    {lim}
                  </MenuItem>
                )) }
              </DropdownButton>
            <Button onClick={() => this.flip(1)} disabled={start + limit >= itemCount}>⏩</Button>
            <Button onClick={() => this.flip(2)} disabled={start + limit >= itemCount}>⏭</Button>
        </ButtonGroup>
      </ButtonToolbar></div>
    );
  }


  flip(direction) {
    const { start, limit, itemCount, onPageChange } = this.props;
    let newStart;
    switch(direction) {
      case -2:
        newStart = 0;
        break;
      case -1:
        newStart = start - limit;
        break;
      case 1:
        newStart = start + limit;
        break;
      case 2:
        newStart = itemCount-1;
        break;
    }

    if (newStart >= itemCount) {
      newStart -= limit;
    }
    if (newStart < 0) {
      newStart = 0;
    }

    newStart = parseInt(newStart / limit) * limit;

    if (start != newStart) {
      onPageChange(newStart);
    }
  }
}


export default createContainer(({ collection, selector, start, limit, onLimitChange }) => {
  return {
    itemCount: collection.find(selector).count(),
    start,
    limit,
    onLimitChange,
  };
}, Pager);
